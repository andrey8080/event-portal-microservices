package back.event.controller;

import back.event.dto.EventDTO;
import back.event.service.EventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EventController.class)
@AutoConfigureMockMvc(addFilters = false)
class EventControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventService eventService;

    @Test
    void listEventsShouldFilterByCategory() throws Exception {
        EventDTO musicEvent = new EventDTO();
        musicEvent.setId(1);
        musicEvent.setTitle("Music Fest");
        musicEvent.setEventCategory("music");

        EventDTO sportEvent = new EventDTO();
        sportEvent.setId(2);
        sportEvent.setTitle("Sport Cup");
        sportEvent.setEventCategory("sport");

        when(eventService.getAllEvents()).thenReturn(List.of(musicEvent, sportEvent));

        mockMvc.perform(get("/events").param("category", "music"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].eventCategory").value("music"));
    }
}
