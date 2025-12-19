package API.resources;

import dto.OrderCreationData;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import model.entities.Employee;
import model.entities.Order;
import model.enums.OrderStatus;
import model.enums.TableNumber;
import services.JournalService;
import services.OrderService;

import java.util.List;
import java.util.Map;

@Path("/order")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class OrderResource {

    @Inject
    OrderService orderService;

    @Inject
    JournalService journalService;

    @GET
    @Path("/get-orders-by-table/{tableNumber}")
    public Response getOrdersByJournal(@PathParam("tableNumber") TableNumber tableNumber) {
        try{

            List<Order> orders = orderService.getLastForTable(tableNumber);
            return Response.ok(orders).build();

        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    //todo написать маппер чтобы не передавать пароль в журналлоге
    @POST
    @Path("/create")
    public Response create(@Context SecurityContext ctx, @NotNull(message = "Body is null") @Valid OrderCreationData data) {

        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (!ctx.isUserInRole("admin")
                && !canCreateOrder(Long.valueOf(ctx.getUserPrincipal().getName()), data.getTableNumber())){
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Попытка создать заказ на стол другого сотрудника").build();
        }

        try {
            long orderId = orderService.create(data.getTableNumber(), data.getDishId(), data.getGuestNumber());

            return Response.status(Response.Status.CREATED)
                    .entity(Map.of(
                            "orderId", orderId,
                            "message", "Заказ создан" ))
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }


    @GET
    @Path("/{id}")
    public Response getOrder(@Context SecurityContext ctx, @PathParam("id") Long id) {

        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        try {
            Order order = orderService.findById(id);
            if (order == null) {
                return Response.status(Response.Status.NOT_FOUND).build();
            }
            return Response.ok(order).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }


    @PUT
    @Path("/modify/{id}")
    public Response modify(@Context SecurityContext ctx,
                           @PathParam("id") Long id,
                           @NotNull(message = "Body is null") @Valid Order order) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {

            order.setId(id);
            orderService.modify(order);
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }


    @DELETE
    @Path("/delete/{id}")
    public Response delete(@Context SecurityContext ctx, @PathParam("id") Long id) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            orderService.delete(id);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }


    @GET
    @Path("/get-all")
    public Response getAll(@Context SecurityContext ctx) {
        try {
            List<Order> orders = orderService.getAll();
            return Response.ok(orders).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Path("/change-status/{id}")
    public Response changeStatus(@Context SecurityContext ctx,
                                 @PathParam("id") Long id,
                                 @QueryParam("status") OrderStatus newStatus) {

        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (newStatus == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("status query param must be provided")
                    .build();
        }

        String role;
        if (ctx.isUserInRole("admin")) {
            role = "admin";
        } else if (ctx.isUserInRole("cook")) {
            role = "cook";
        } else if (ctx.isUserInRole("barman")) {
            role = "barman";
        } else {
            role = "waiter";
        }

        try {
            orderService.changeStatus(id, newStatus, role);
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    public boolean canCreateOrder(Long employeeId, TableNumber tableNumber) {
        Employee employee = journalService.getEmployee(tableNumber);
        System.out.println(employeeId);
        if (employee != null) {
            System.out.println(employee.getId());
            return employee.getId().equals(employeeId);
        }
        return true;
    }

}