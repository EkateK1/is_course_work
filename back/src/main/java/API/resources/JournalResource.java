package API.resources;

import dto.EmployeeResponseData;
import dto.JournalData;
import dto.JournalLogResponseData;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import mappers.EmployeeMapper;
import mappers.JournalLogMapper;
import model.entities.Employee;
import model.entities.JournalLog;
import model.enums.TableNumber;
import model.enums.TableStatus;
import services.JournalService;
import validation.EmployeeIdValidator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Path("/journal")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class JournalResource {

    @Inject
    JournalService journalService;

    @Inject
    EmployeeIdValidator employeeIdValidator;

    @POST
    @Path("/make-record")
    public Response createRecord(@Context SecurityContext ctx,
                                 @NotNull(message = "Body is null") JournalData journalData) {
        if (ctx.getUserPrincipal() == null || ctx.isUserInRole("cook")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        String valid = employeeIdValidator.validate(journalData.getEmployeeId());
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }

        Employee employee = journalService.getEmployee(journalData.getTableNumber());
        if (employee != null && !ctx.isUserInRole("admin")
                && journalData.getTableStatus() != TableStatus.occupied
                && !employee.getId().equals(journalData.getEmployeeId())) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("Попытка изменить статус чужого стола").build();
        }

        try {
            JournalLog journalLog = journalService.create(journalData);
            return Response.status(Response.Status.CREATED).entity(journalLog.getId()).build();
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GET
    @Path("/get-table-status/{tableNumber}")
    public Response getLastTableStatus(@Context SecurityContext ctx,
                                       @PathParam("tableNumber") TableNumber tableNumber) {
        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        TableStatus tableStatus;
        try {
            tableStatus = journalService.getTableStatus(tableNumber);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.OK).entity(tableStatus).build();
    }

    @GET
    @Path("/get-employee/{tableNumber}")
    public Response getEmployee(@Context SecurityContext ctx,
                                       @PathParam("tableNumber") TableNumber tableNumber) {
        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        EmployeeResponseData employeeData;
        try {
            Employee employee = journalService.getEmployee(tableNumber);
            employeeData = EmployeeMapper.toDto(employee);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.OK).entity(employeeData).build();
    }

    @GET
    @Path("/get-all-statuses")
    public Response getAllTableStatuses(@Context SecurityContext ctx){
        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Map<TableNumber, TableStatus> tableStatuses;
        try {
            tableStatuses = journalService.getTableStatuses();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.OK).entity(tableStatuses).build();
    }

    @POST
    @Path("/reset-employee")
    public Response resetEmployee(@Context SecurityContext ctx,
                                  @NotNull(message = "Body is null") JournalData journalData) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        Long id = journalData.getEmployeeId();
        TableNumber tableNumber = journalData.getTableNumber();

        try {
            journalService.resetEmployee(id, tableNumber);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.OK).build();
    }

    @GET
    @Path("/get-last-for-hours/{hours}")
    public Response getLast15h(@Context SecurityContext ctx, @PathParam("hours") Integer hours) {
        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (hours == null || hours < 1) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Период в часах должен быть положительным").build();
        }
        List<JournalLogResponseData> journalLogsResponses = new ArrayList<>();
        try {
            List<JournalLog> journalLogs = journalService.getLastForHours(hours);
            for (JournalLog journalLog : journalLogs) {
                journalLogsResponses.add(JournalLogMapper.toDto(journalLog));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.OK).entity(journalLogsResponses).build();
    }
}
