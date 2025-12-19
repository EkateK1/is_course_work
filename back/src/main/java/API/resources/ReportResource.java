package API.resources;

import dto.EmployeeResponseData;
import dto.reports.EmployeeReportData;
import dto.reports.MainReportData;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import services.ReportService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Path("/report")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ReportResource {

    @Inject
    ReportService reportService;

    @GET
    @Path("/main/{dateStr}")
    public Response getMainReport(@Context SecurityContext ctx, @PathParam("dateStr") String dateStr) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        LocalDate date = LocalDate.parse(dateStr);
        try {
            MainReportData report = reportService.mainReport(date);
            return Response.ok(report).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GET
    @Path("/employee-all/{dateStr}")
    public Response getEmployeeAllReport(@Context SecurityContext ctx, @PathParam("dateStr") String dateStr) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        LocalDate date = LocalDate.parse(dateStr);
        try {
            Map<Long, EmployeeReportData> report = reportService.employeeAllReport(date);
            return Response.ok(report).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GET
    @Path("/employee-own/{dateStr}")
    public Response getEmployeeOwnReport(@Context SecurityContext ctx, @PathParam("dateStr") String dateStr) {
        if (ctx.getUserPrincipal() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Long id = Long.valueOf(ctx.getUserPrincipal().getName());
        LocalDate date = LocalDate.parse(dateStr);
        try {
            EmployeeReportData report = reportService.employeeReport(id, date);
            return Response.ok(report).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}
