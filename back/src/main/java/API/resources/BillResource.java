package API.resources;

import dto.BillCreationRequest;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import model.entities.Bill;
import model.entities.Employee;
import model.entities.JournalLog;
import services.BillService;
import services.JournalService;

import java.util.Map;

@Path("/bills")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class BillResource {

    @Inject
    private BillService billService;
    @Inject
    JournalService journalService;


    @POST
    @Path("/create")
    public Response createBill(@Context SecurityContext ctx, @Valid BillCreationRequest request) {

        Employee employee = journalService.getEmployee(request.getTableNumber());

        if (!ctx.isUserInRole("admin")
                && !Long.valueOf(ctx.getUserPrincipal().getName()).equals(employee.getId()) ) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Попытка создать счет на стол другого сотрудника").build();
        }

        Long id = billService.createBill(request);
        var tableNumber = billService.getTableNumberForBill(id);

        int bonusPoints = billService.calculateBonus(id, request.isBirthday());

        return Response.status(Response.Status.CREATED)
                .entity(Map.of(
                        "billId", id,
                        "bonusPoints", bonusPoints,
                        "message", "Счет для стола: "
                                + (tableNumber != null ? tableNumber.name() : "неизвестен")
                                + " создан (occupied -> not_paid)"
                ))
                .build();}


    @GET
    @Path("/{id}")
    public Response getBill(@PathParam("id") Long id,
                            @QueryParam("birthday") @DefaultValue("false") boolean birthday) {
        var tableNumber = billService.getTableNumberForBill(id);
        Bill bill = billService.getBill(id);
        if (bill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("message", "Не найден закрытый, но неоплаченный счет (not_paid) на столе: " +
                            (tableNumber != null ? tableNumber.name() : "неизвестен")))
                    .build();
        }

        int totalBonus = billService.calculateBonus(id, birthday);

        return Response.ok(Map.of(
                "bill", bill,
                "bonusPoints", totalBonus
        )).build();
    }


    @POST
    @Path("/pay/{id}")
    public Response payBill(@Context SecurityContext ctx, @PathParam("id") Long id) {

        Employee employee = journalService.getEmployee(billService.getTableNumberForBill(id));

        if (!ctx.isUserInRole("admin")
                && !Long.valueOf(ctx.getUserPrincipal().getName()).equals(employee.getId()) ) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Попытка отметить отмеченным счет другого сотрудника").build();
        }
        boolean updated = billService.payBill(id);
        var tableNumber = billService.getTableNumberForBill(id);
        if (!updated) {


            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Нет закрытого и неоплаченного счета на столе: " +
                            (tableNumber != null ? tableNumber.name() : "неизвестен"))).build();
        }
        return Response.ok(Map.of(
                "billId", id,
                "message", "Счет стола оплачен (PAID)" +
                        (tableNumber != null ? tableNumber.name() : "неизвестен"))).build();
    }
}
