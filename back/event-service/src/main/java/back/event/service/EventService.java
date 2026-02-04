package back.event.service;

import back.event.dto.EventDTO;
import back.event.dto.UserDTO;
import back.event.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EventService {
    private final JdbcTemplate jdbcTemplate;
    private final UserService userService;
    private final JavaMailSender javaMailSender;

    public EventService(JdbcTemplate jdbcTemplate, UserService userService, JavaMailSender javaMailSender) {
        this.jdbcTemplate = jdbcTemplate;
        this.userService = userService;
        this.javaMailSender = javaMailSender;
    }

    public EventDTO getEventById(int id) {
        String sql = """
                SELECT \"ID\", \"title\", \"description\", \"startDate\", \"endDate\", \"address\", \"latitude\", \"longitude\",
                \"organizerId\", \"organizerName\", \"price\", \"maxParticipants\", \"registeredParticipants\", \"hasQuiz\",
                \"images\", \"eventCategory\", \"status\", \"tags\"
                FROM \"Event\"
                WHERE \"ID\" = ?
                """;

        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                String imagesString = rs.getString("images");
                List<String> imagesList = imagesString != null && !imagesString.isEmpty()
                        ? List.of(imagesString.split(","))
                        : new ArrayList<>();

                String tagsString = rs.getString("tags");
                List<String> tagsList = tagsString != null && !tagsString.isEmpty()
                        ? List.of(tagsString.split(","))
                        : new ArrayList<>();

                return new EventDTO(
                        rs.getInt("ID"),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("startDate"),
                        rs.getString("endDate"),
                        rs.getString("address"),
                        rs.getDouble("latitude"),
                        rs.getDouble("longitude"),
                        rs.getInt("organizerId"),
                        rs.getString("organizerName"),
                        rs.getDouble("price"),
                        rs.getInt("maxParticipants"),
                        rs.getInt("registeredParticipants"),
                        rs.getBoolean("hasQuiz"),
                        imagesList,
                        rs.getString("eventCategory"),
                        rs.getString("status"),
                        tagsList);
            }, id);
        } catch (Exception e) {
            return null;
        }
    }

    public String addEvent(String token, EventDTO dto) {
        if (dto.getTitle() == null || dto.getDescription() == null || dto.getStartDate() == null
                || dto.getEndDate() == null || dto.getAddress() == null) {
            return "All event fields must be provided. " + dto;
        }

        String email = userService.extractEmail(token);
        String userRole = userService.getUserRole(token);
        if (userRole == null || (!userRole.equals("admin") && !userRole.equals("organizer"))) {
            return "Only organizers or admins can create events.";
        }

        String insertSql = """
                INSERT INTO \"Event\" (\"title\", \"description\", \"startDate\", \"endDate\", \"address\", \"latitude\", \"longitude\",
                \"organizerId\", \"organizerName\", \"price\", \"maxParticipants\", \"registeredParticipants\", \"hasQuiz\", \"images\",
                \"eventCategory\", \"status\", \"tags\")
                SELECT ?, ?, CAST(? AS TIMESTAMP), CAST(? AS TIMESTAMP), ?, ?, ?, \"ID\", ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM \"User\" WHERE LOWER(\"email\") = LOWER(?)
                """;

        String tagsString = dto.getTags() != null ? String.join(",", dto.getTags()) : "";
        String status = dto.getStatus() != null ? dto.getStatus() : "active";

        jdbcTemplate.update(insertSql, dto.getTitle(), dto.getDescription(), dto.getStartDate(), dto.getEndDate(),
                dto.getAddress(), dto.getLatitude(), dto.getLongitude(), dto.getOrganizerName(),
                dto.getPrice(), dto.getMaxParticipants(), dto.getRegisteredParticipants(), dto.isHasQuiz(),
                dto.getImages() != null ? String.join(",", dto.getImages()) : "", dto.getEventCategory(), status,
                tagsString, email);

        return "Event created successfully.";
    }

    public String updateEvent(String token, int eventId, EventDTO dto) {
        String role = userService.getUserRole(token);
        String email = userService.extractEmail(token);

        if ("admin".equals(role)) {
            String sql = """
                    UPDATE \"Event\"
                    SET \"title\" = ?, \"description\" = ?, \"startDate\" = CAST(? AS TIMESTAMP), \"endDate\" = CAST(? AS TIMESTAMP),
                    \"address\" = ?, \"latitude\" = ?, \"longitude\" = ?, \"price\" = ?, \"maxParticipants\" = ?,
                    \"registeredParticipants\" = ?, \"hasQuiz\" = ?, \"images\" = ?, \"eventCategory\" = ?, \"status\" = ?, \"tags\" = ?
                    WHERE \"ID\" = ?
                    """;

            String tagsString = dto.getTags() != null ? String.join(",", dto.getTags()) : "";
            String status = dto.getStatus() != null ? dto.getStatus() : "active";

            jdbcTemplate.update(sql, dto.getTitle(), dto.getDescription(), dto.getStartDate(), dto.getEndDate(),
                    dto.getAddress(), dto.getLatitude(), dto.getLongitude(), dto.getPrice(),
                    dto.getMaxParticipants(), dto.getRegisteredParticipants(), dto.isHasQuiz(),
                    dto.getImages() != null ? String.join(",", dto.getImages()) : "", dto.getEventCategory(), status,
                    tagsString, eventId);

            return "Event updated successfully.";
        }

        String checkOrganizerSql = """
                SELECT COUNT(*) FROM \"Event\" WHERE \"ID\" = ? AND \"organizerId\" = (SELECT \"ID\" FROM \"User\" WHERE LOWER(\"email\") = LOWER(?))
                """;
        Integer count = jdbcTemplate.queryForObject(checkOrganizerSql, Integer.class, eventId, email);
        if (count != null && count > 0) {
            String sql = """
                    UPDATE \"Event\"
                    SET \"title\" = ?, \"description\" = ?, \"startDate\" = CAST(? AS TIMESTAMP), \"endDate\" = CAST(? AS TIMESTAMP),
                    \"address\" = ?, \"latitude\" = ?, \"longitude\" = ?, \"price\" = ?, \"maxParticipants\" = ?,
                    \"registeredParticipants\" = ?, \"hasQuiz\" = ?, \"images\" = ?, \"eventCategory\" = ?, \"status\" = ?, \"tags\" = ?
                    WHERE \"ID\" = ?
                    """;

            String tagsString = dto.getTags() != null ? String.join(",", dto.getTags()) : "";
            String status = dto.getStatus() != null ? dto.getStatus() : "active";

            jdbcTemplate.update(sql, dto.getTitle(), dto.getDescription(), dto.getStartDate(), dto.getEndDate(),
                    dto.getAddress(), dto.getLatitude(), dto.getLongitude(), dto.getPrice(),
                    dto.getMaxParticipants(), dto.getRegisteredParticipants(), dto.isHasQuiz(),
                    dto.getImages() != null ? String.join(",", dto.getImages()) : "", dto.getEventCategory(), status,
                    tagsString, eventId);

            return "Event updated successfully.";
        }

        return "Only the event organizer or admins can edit events.";
    }

    public String deleteEvent(String token, int eventId) {
        String role = userService.getUserRole(token);
        String email = userService.extractEmail(token);

        if ("admin".equals(role)) {
            String sql = "DELETE FROM \"Event\" WHERE \"ID\" = ?";
            jdbcTemplate.update(sql, eventId);
            return "Event deleted.";
        }

        String checkOrganizerSql = """
                SELECT COUNT(*) FROM \"Event\" WHERE \"ID\" = ? AND \"organizerId\" = (SELECT \"ID\" FROM \"User\" WHERE LOWER(\"email\") = LOWER(?))
                """;
        Integer count = jdbcTemplate.queryForObject(checkOrganizerSql, Integer.class, eventId, email);
        if (count != null && count > 0) {
            String sql = "DELETE FROM \"Event\" WHERE \"ID\" = ?";
            jdbcTemplate.update(sql, eventId);
            return "Event deleted.";
        }

        return "Only the event organizer or admins can delete events.";
    }

    public List<EventDTO> getAllEvents() {
        String sql = """
                SELECT \"ID\", \"title\", \"description\", \"startDate\", \"endDate\", \"address\", \"latitude\", \"longitude\",
                \"organizerId\", \"organizerName\", \"price\", \"maxParticipants\", \"registeredParticipants\", \"hasQuiz\",
                \"images\", \"eventCategory\", \"status\", \"tags\"
                FROM \"Event\"
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            String imagesString = rs.getString("images");
            List<String> imagesList = imagesString != null && !imagesString.isEmpty() ? List.of(imagesString.split(","))
                    : new ArrayList<>();

            String tagsString = rs.getString("tags");
            List<String> tagsList = tagsString != null && !tagsString.isEmpty() ? List.of(tagsString.split(","))
                    : new ArrayList<>();

            return new EventDTO(
                    rs.getInt("ID"),
                    rs.getString("title"),
                    rs.getString("description"),
                    rs.getString("startDate"),
                    rs.getString("endDate"),
                    rs.getString("address"),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getInt("organizerId"),
                    rs.getString("organizerName"),
                    rs.getDouble("price"),
                    rs.getInt("maxParticipants"),
                    rs.getInt("registeredParticipants"),
                    rs.getBoolean("hasQuiz"),
                    imagesList,
                    rs.getString("eventCategory"),
                    rs.getString("status"),
                    tagsList);
        });
    }

    public String registerForEvent(String token, int eventId) {
        String email = userService.extractEmail(token);
        if (email == null) {
            return "Invalid token.";
        }
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return "User not found.";
        }

        String checkEventSql = """
                SELECT COUNT(*) FROM \"Event\" WHERE \"ID\" = ?
                """;
        Integer eventExists = jdbcTemplate.queryForObject(checkEventSql, Integer.class, eventId);
        if (eventExists == null || eventExists == 0) {
            return "Event not found.";
        }

        String checkCapacitySql = """
                SELECT \"maxParticipants\", \"registeredParticipants\" FROM \"Event\" WHERE \"ID\" = ?
                """;
        Map<String, Object> capacityInfo = jdbcTemplate.queryForMap(checkCapacitySql, eventId);
        int maxParticipants = ((Number) capacityInfo.get("maxParticipants")).intValue();
        int registeredParticipants = ((Number) capacityInfo.get("registeredParticipants")).intValue();

        if (maxParticipants > 0 && registeredParticipants >= maxParticipants) {
            return "Event is full.";
        }

        String checkRegistrationSql = """
                SELECT COUNT(*) FROM \"Registration\" WHERE \"event\" = ? AND \"member\" = ?
                """;
        Integer count = jdbcTemplate.queryForObject(checkRegistrationSql, Integer.class, eventId, user.getId());
        if (count != null && count > 0) {
            return "Already registered.";
        }

        String registerSql = """
                INSERT INTO \"Registration\" (\"event\", \"member\") VALUES (?, ?)
                """;
        jdbcTemplate.update(registerSql, eventId, user.getId());
        return "Registration successful.";
    }

    public List<UserDTO> getRegisteredUsers(String token, int eventId) {
        String sql = """
                SELECT u.\"ID\", u.\"name\", u.\"email\", u.\"phoneNumber\"
                FROM \"Registration\" r
                JOIN \"User\" u ON r.\"member\" = u.\"ID\"
                WHERE r.\"event\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new UserDTO(
                rs.getInt("ID"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("phoneNumber")), eventId);
    }

    public String leaveFeedback(String token, int eventId, int rating, String comment) {
        String email = userService.extractEmail(token);
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return "User not found.";
        }

        String checkRegistrationSql = """
                SELECT COUNT(*) FROM \"Registration\" WHERE \"event\" = ? AND \"member\" = ?
                """;
        Integer count = jdbcTemplate.queryForObject(checkRegistrationSql, Integer.class, eventId, user.getId());
        if (count == null || count == 0) {
            return "You did not attend this event.";
        }

        String insertFeedbackSql = """
                INSERT INTO \"Feedback\" (\"user\", \"event\", \"rating\", \"comment\")
                VALUES (?, ?, ?, ?)
                """;
        jdbcTemplate.update(insertFeedbackSql, user.getId(), eventId, rating, comment);
        return "Feedback submitted successfully.";
    }

    public List<EventDTO> getParticipatedEvents(int id) {
        String sql = """
                SELECT e.\"ID\", e.\"title\", e.\"description\", e.\"startDate\", e.\"endDate\", e.\"address\", e.\"latitude\", e.\"longitude\",
                e.\"organizerId\", e.\"organizerName\", e.\"price\", e.\"maxParticipants\", e.\"registeredParticipants\", e.\"hasQuiz\",
                e.\"images\", e.\"eventCategory\", e.\"status\", e.\"tags\"
                FROM \"Registration\" r
                JOIN \"Event\" e ON r.\"event\" = e.\"ID\"
                WHERE r.\"member\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            String imagesString = rs.getString("images");
            List<String> imagesList = imagesString != null && !imagesString.isEmpty() ? List.of(imagesString.split(","))
                    : new ArrayList<>();

            String tagsString = rs.getString("tags");
            List<String> tagsList = tagsString != null && !tagsString.isEmpty() ? List.of(tagsString.split(","))
                    : new ArrayList<>();

            return new EventDTO(
                    rs.getInt("ID"),
                    rs.getString("title"),
                    rs.getString("description"),
                    rs.getString("startDate"),
                    rs.getString("endDate"),
                    rs.getString("address"),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getInt("organizerId"),
                    rs.getString("organizerName"),
                    rs.getDouble("price"),
                    rs.getInt("maxParticipants"),
                    rs.getInt("registeredParticipants"),
                    rs.getBoolean("hasQuiz"),
                    imagesList,
                    rs.getString("eventCategory"),
                    rs.getString("status"),
                    tagsList);
        }, id);
    }

    public List<String> getFeedbacks(String tokenWithoutPrefix, int eventId) {
        String sql = """
                SELECT f.\"rating\", f.\"comment\", u.\"name\", u.\"ID\" as userId
                FROM \"Feedback\" f
                JOIN \"User\" u ON f.\"user\" = u.\"ID\"
                WHERE f.\"event\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            int userId = rs.getInt("userId");
            String userName = rs.getString("name");
            int rating = rs.getInt("rating");
            String comment = rs.getString("comment");
            return userId + ":" + userName + ":" + rating + ":" + comment;
        }, eventId);
    }

    public String deleteFeedback(String tokenWithoutPrefix, int feedbackId) {
        String sql = "DELETE FROM \"Feedback\" WHERE \"ID\" = ?";
        jdbcTemplate.update(sql, feedbackId);
        return "Feedback deleted.";
    }

    public String sendNewsletter(String tokenWithoutPrefix, int id, String message) {
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return "User not authorized.";
        }

        String sql = """
                SELECT \"email\" FROM \"User\"
                WHERE \"ID\" IN (SELECT \"member\" FROM \"Registration\" WHERE \"event\" = ?)
                """;
        List<String> emails = jdbcTemplate.queryForList(sql, String.class, id);
        if (emails.isEmpty()) {
            return "No registered users for this event.";
        }

        int successCount = 0;
        for (String recipient : emails) {
            sendEmail(recipient, message);
            successCount++;
        }

        return successCount > 0 ? "Newsletter sent." : "Failed to send newsletter.";
    }

    private void sendEmail(String to, String text) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("no-reply@event-portal.local", "Event Portal");
            helper.setTo(to);
            helper.setSubject("Event Newsletter");
            helper.setText(text, true);

            javaMailSender.send(message);
            System.out.println("Email sent successfully to " + to);
        } catch (MessagingException | UnsupportedEncodingException e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    public boolean cancelRegistration(String tokenWithoutPrefix, int eventId) {
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return false;
        }

        String sql = "DELETE FROM \"Registration\" WHERE \"event\" = ? AND \"member\" = ?";
        jdbcTemplate.update(sql, eventId, user.getId());
        return true;
    }

    public boolean checkRegistration(String tokenWithoutPrefix, int eventId) {
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return false;
        }

        String sql = """
                SELECT COUNT(*) FROM \"Registration\" WHERE \"event\" = ? AND \"member\" = ?
                """;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, eventId, user.getId());
        return count != null && count > 0;
    }

    public List<EventDTO> getCreatedEvents(String token) {
        String email = userService.extractEmail(token);
        String sql = """
                SELECT \"ID\", \"title\", \"description\", \"startDate\", \"endDate\", \"address\", \"latitude\", \"longitude\",
                \"organizerId\", \"organizerName\", \"price\", \"maxParticipants\", \"registeredParticipants\", \"hasQuiz\",
                \"images\", \"eventCategory\", \"status\", \"tags\"
                FROM \"Event\"
                WHERE \"organizerId\" = (SELECT \"ID\" FROM \"User\" WHERE LOWER(\"email\") = LOWER(?))
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            String imagesString = rs.getString("images");
            List<String> imagesList = imagesString != null && !imagesString.isEmpty() ? List.of(imagesString.split(","))
                    : new ArrayList<>();

            String tagsString = rs.getString("tags");
            List<String> tagsList = tagsString != null && !tagsString.isEmpty() ? List.of(tagsString.split(","))
                    : new ArrayList<>();

            return new EventDTO(
                    rs.getInt("ID"),
                    rs.getString("title"),
                    rs.getString("description"),
                    rs.getString("startDate"),
                    rs.getString("endDate"),
                    rs.getString("address"),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getInt("organizerId"),
                    rs.getString("organizerName"),
                    rs.getDouble("price"),
                    rs.getInt("maxParticipants"),
                    rs.getInt("registeredParticipants"),
                    rs.getBoolean("hasQuiz"),
                    imagesList,
                    rs.getString("eventCategory"),
                    rs.getString("status"),
                    tagsList);
        }, email);
    }

    public double getMiddleScore(String tokenWithoutPrefix, int eventId) {
        String sql = "SELECT AVG(\"rating\") FROM \"Feedback\" WHERE \"event\" = ?";
        Double v = jdbcTemplate.queryForObject(sql, Double.class, eventId);
        return v != null ? v : 0.0;
    }

    public double getAverageScoreForMyAll(String tokenWithoutPrefix) {
        String email = userService.extractEmail(tokenWithoutPrefix);
        String sql = """
                SELECT AVG(f.\"rating\")
                FROM \"Feedback\" f
                JOIN \"Event\" e ON f.\"event\" = e.\"ID\"
                WHERE e.\"organizerId\" = (SELECT \"ID\" FROM \"User\" WHERE LOWER(\"email\") = LOWER(?))
                """;
        Double result = jdbcTemplate.queryForObject(sql, Double.class, email);
        return result != null ? result : 0.0;
    }

    public int getUserCountForMyEvents(String tokenWithoutPrefix) {
        String email = userService.extractEmail(tokenWithoutPrefix);
        String sql = """
                SELECT COUNT(DISTINCT r.\"member\")
                FROM \"Registration\" r
                JOIN \"Event\" e ON r.\"event\" = e.\"ID\"
                WHERE e.\"organizerId\" = (SELECT \"ID\" FROM \"User\" WHERE LOWER(\"email\") = LOWER(?))
                """;
        Integer v = jdbcTemplate.queryForObject(sql, Integer.class, email);
        return v != null ? v : 0;
    }
}
