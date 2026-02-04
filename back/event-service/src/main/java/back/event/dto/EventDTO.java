package back.event.dto;

import java.util.List;

public class EventDTO {
    private int id;
    private String title;
    private String description;
    private String startDate;
    private String endDate;
    private String address;
    private Double latitude;
    private Double longitude;
    private int organizerId;
    private String organizerName;
    private double price;
    private int maxParticipants;
    private int registeredParticipants;
    private boolean hasQuiz;
    private List<String> images;
    private String eventCategory;
    private String status;
    private List<String> tags;

    public EventDTO() {
    }

    public EventDTO(
            int id,
            String title,
            String description,
            String startDate,
            String endDate,
            String address,
            Double latitude,
            Double longitude,
            int organizerId,
            String organizerName,
            double price,
            int maxParticipants,
            int registeredParticipants,
            boolean hasQuiz,
            List<String> images,
            String eventCategory,
            String status,
            List<String> tags) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.organizerId = organizerId;
        this.organizerName = organizerName;
        this.price = price;
        this.maxParticipants = maxParticipants;
        this.registeredParticipants = registeredParticipants;
        this.hasQuiz = hasQuiz;
        this.images = images;
        this.eventCategory = eventCategory;
        this.status = status;
        this.tags = tags;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public int getOrganizerId() {
        return organizerId;
    }

    public void setOrganizerId(int organizerId) {
        this.organizerId = organizerId;
    }

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getMaxParticipants() {
        return maxParticipants;
    }

    public void setMaxParticipants(int maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public int getRegisteredParticipants() {
        return registeredParticipants;
    }

    public void setRegisteredParticipants(int registeredParticipants) {
        this.registeredParticipants = registeredParticipants;
    }

    public boolean isHasQuiz() {
        return hasQuiz;
    }

    public void setHasQuiz(boolean hasQuiz) {
        this.hasQuiz = hasQuiz;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getEventCategory() {
        return eventCategory;
    }

    public void setEventCategory(String eventCategory) {
        this.eventCategory = eventCategory;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    @Override
    public String toString() {
        return "EventDTO{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", startDate='" + startDate + '\'' +
                ", endDate='" + endDate + '\'' +
                ", address='" + address + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", organizerId=" + organizerId +
                ", organizerName='" + organizerName + '\'' +
                ", price=" + price +
                ", eventCategory='" + eventCategory + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}
