package API.resources;

import jakarta.ejb.EJBException;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import model.entities.Employee;
import services.EmployeeService;

import java.util.ArrayList;
import java.util.List;

@Path("/employee")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class EmployeeResource {

    @Inject
    EmployeeService employeeService;

    @POST
    @Path("/modify")
    public Response modify(@Context SecurityContext ctx,
                           @NotNull(message = "Body is null") @Valid Employee employee) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            employeeService.modify(employee);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @DELETE
    @Path("/delete/{id}")
    public Response delete(@Context SecurityContext ctx, @PathParam("id") Long id) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            employeeService.delete(id);
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @GET
    @Path("/get-all")
    public Response getAll(@Context SecurityContext ctx) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        List<Employee> employees;
        try {
            employees = employeeService.getAll();
            return Response.ok(employees).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}
