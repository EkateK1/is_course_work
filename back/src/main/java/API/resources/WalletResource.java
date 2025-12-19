package API.resources;

import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import services.WalletService;

import java.math.BigDecimal;
import java.util.Map;

@Path("/wallet")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WalletResource {

    @Inject
    WalletService walletService;

    @GET
    @Path("/get-balance/{employeeId}")
    public Response getBalance(@Context SecurityContext ctx, @PathParam("employeeId") Long employeeId) {
        if (!Long.valueOf(ctx.getUserPrincipal().getName()).equals(employeeId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Попытка узнать баланс чужого кошелька").build();
        }
        BigDecimal balance;
        try {
            balance = walletService.getBalance(employeeId);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(Map.of("employeeId", employeeId, "balance", balance)).build();
    }

    @GET
    @Path("/withdraw/{amount}")
    public Response withdrawal(@Context SecurityContext ctx, @PathParam("amount") BigDecimal amount) {
        Long employeeId = Long.valueOf(ctx.getUserPrincipal().getName());
        try {
            walletService.withdrawal(employeeId, amount);
        } catch (IllegalArgumentException | ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(Map.of("employeeId", employeeId, "amount", amount)).build();
    }

}
