package API.resources;

import dto.AuthData;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import model.entities.Employee;
import services.AuthService;
import services.WalletService;

@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    private AuthService authService;

    @Inject
    WalletService walletService;

    @POST
    @Path("/register")
    public Response register(@Context SecurityContext ctx,
                             @NotNull(message = "Body is null") @Valid Employee employee) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            AuthData result = authService.register(employee);
            walletService.create(employee);

            return Response.status(Response.Status.CREATED)
                    .entity(result)
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(e.getMessage())
                    .build();
        }
    }

    @POST
    @Path("/login")
    public Response login(AuthData authData) {
        try {
            String token = authService.login(authData.id, authData.code);
            return Response.ok(token).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(e.getMessage())
                    .build();
        }
    }
}
