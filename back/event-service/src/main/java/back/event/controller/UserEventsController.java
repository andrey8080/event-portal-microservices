package back.event.controller;

import back.event.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/events")
public class UserEventsController {
    private final EventService eventService;

    public UserEventsController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping("/users/{id}/participated")
    public ResponseEntity<?> participated(@PathVariable int id) {
        return ResponseEntity.ok(eventService.getParticipatedEvents(id));
    }

    @GetMapping("/me/created")
    public ResponseEntity<?> created(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        return ResponseEntity.ok(eventService.getCreatedEvents(tokenWithoutPrefix));
    }

    @GetMapping("/me/participants/count")
    public ResponseEntity<?> participantCount(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        int count = eventService.getUserCountForMyEvents(tokenWithoutPrefix);
        return ResponseEntity.ok("{\"count\":" + count + "}");
    }

    @GetMapping("/me/feedback/average-score")
    public ResponseEntity<?> myAverageScore(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        double score = eventService.getAverageScoreForMyAll(tokenWithoutPrefix);
        return ResponseEntity.ok("{\"score\":" + score + "}");
    }
}
