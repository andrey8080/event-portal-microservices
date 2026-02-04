package back.event.controller;

import back.event.dto.EventDTO;
import back.event.dto.FeedbackRequest;
import back.event.dto.UserDTO;
import back.event.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestHeader("Authorization") String token, @RequestBody EventDTO dto) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.addEvent(tokenWithoutPrefix, dto);
        if (result.startsWith("Event")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@RequestHeader("Authorization") String token,
            @PathVariable int id,
            @RequestBody EventDTO dto) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.updateEvent(tokenWithoutPrefix, id, dto);
        if (result.startsWith("Event")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.deleteEvent(tokenWithoutPrefix, id);
        if (result.equals("Event deleted.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @GetMapping
    public ResponseEntity<?> listEvents(@RequestParam(value = "category", required = false) String category) {
        List<EventDTO> events = eventService.getAllEvents();
        if (category == null || category.isBlank()) {
            return ResponseEntity.ok(events);
        }
        List<EventDTO> filtered = events.stream()
                .filter(event -> category.equalsIgnoreCase(event.getEventCategory()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEventById(@PathVariable int id) {
        EventDTO event = eventService.getEventById(id);
        if (event != null) {
            return ResponseEntity.ok(event);
        }
        return ResponseEntity.status(404).body("{\"error\":\"Event not found.\"}");
    }

    @PostMapping("/{id}/registrations")
    public ResponseEntity<?> registerForEvent(@RequestHeader("Authorization") String token,
            @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.registerForEvent(tokenWithoutPrefix, id);
        if (result.equals("Registration successful.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @GetMapping("/{id}/registrations/me")
    public ResponseEntity<?> checkRegistration(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        boolean registered = eventService.checkRegistration(tokenWithoutPrefix, id);
        return ResponseEntity.ok("{\"registered\":" + registered + "}");
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<?> getEventParticipants(@RequestHeader("Authorization") String token, @PathVariable int id) {
        String tokenWithoutPrefix = token.substring(7);
        List<UserDTO> participants = eventService.getRegisteredUsers(tokenWithoutPrefix, id);
        return ResponseEntity.ok(participants);
    }

    @DeleteMapping("/{id}/registrations/me")
    public ResponseEntity<?> cancelRegistration(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        boolean canceled = eventService.cancelRegistration(tokenWithoutPrefix, id);
        return ResponseEntity.ok("{\"canceled\":" + canceled + "}");
    }

    @GetMapping("/{id}/registrations")
    public ResponseEntity<?> getRegistrations(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        List<UserDTO> users = eventService.getRegisteredUsers(tokenWithoutPrefix, id);
        return ResponseEntity.ok(users);
    }

    @PostMapping("/{id}/feedback")
    public ResponseEntity<?> leaveFeedback(@RequestHeader("Authorization") String token,
            @PathVariable int id,
            @RequestBody FeedbackRequest request) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.leaveFeedback(tokenWithoutPrefix, id, request.getRating(), request.getComment());
        if (result.equals("Feedback submitted successfully.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @DeleteMapping("/{eventId}/feedback/{feedbackId}")
    public ResponseEntity<?> deleteFeedback(@RequestHeader("Authorization") String token,
            @PathVariable int eventId,
            @PathVariable int feedbackId) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.deleteFeedback(tokenWithoutPrefix, feedbackId);
        if (result.equals("Feedback deleted.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @GetMapping("/{id}/feedback")
    public ResponseEntity<?> getFeedbacks(@RequestHeader("Authorization") String token, @PathVariable int id) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(List.of("Null token"));
            }
            String tokenWithoutPrefix = token.substring(7);
            List<String> feedbacks = eventService.getFeedbacks(tokenWithoutPrefix, id);
            return ResponseEntity.ok(feedbacks);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(List.of("Ошибка при получении отзывов: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/feedback/middle-score")
    public ResponseEntity<?> getMiddleScore(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        double score = eventService.getMiddleScore(tokenWithoutPrefix, id);
        return ResponseEntity.ok("{\"score\":" + score + "}");
    }

    @PostMapping("/{id}/newsletter")
    public ResponseEntity<?> sendNewsletter(@RequestHeader("Authorization") String token, @PathVariable int id,
            @RequestBody String message) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String result = eventService.sendNewsletter(tokenWithoutPrefix, id, message);
        if (result.startsWith("Newsletter sent")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }
}
