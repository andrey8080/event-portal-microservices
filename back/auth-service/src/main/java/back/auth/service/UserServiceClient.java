package back.auth.service;

import back.auth.model.InternalUserDTO;
import back.auth.model.UserSignupRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Service
public class UserServiceClient {
    private final RestClient restClient;

    public UserServiceClient(@Value("${services.user.base-url}") String userServiceBaseUrl) {
        this.restClient = RestClient.builder().baseUrl(userServiceBaseUrl).build();
    }

    public InternalUserDTO getByEmail(String email) {
        return restClient
                .get()
                .uri(uriBuilder -> uriBuilder.path("/internal/users/by-email").queryParam("email", email).build())
                .retrieve()
                .body(InternalUserDTO.class);
    }

    public InternalUserDTO createUser(UserSignupRequest request) {
        return restClient
                .post()
                .uri("/internal/users")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(InternalUserDTO.class);
    }
}
