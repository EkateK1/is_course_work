package API.resources;

import dto.FeedbackCreationRequest;
import dto.FeedbackResponseData;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import mappers.FeedbackMapper;
import model.entities.Feedback;
import services.FeedbackService;
import validation.EmployeeIdValidator;
import validation.FeedbackValidation;

import java.util.ArrayList;
import java.util.List;

@Path("/feedback")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class FeedbackResource {

    @Inject
    FeedbackService feedbackService;

    @Inject
    FeedbackValidation feedbackValidation;

    @Inject
    EmployeeIdValidator employeeIdValidator;

    @POST
    @Path("/create")
    public Response createFeedback(@NotNull(message = "Body is null") FeedbackCreationRequest feedback) {
        String valid = feedbackValidation.validate(feedback);
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }
        try {
            feedbackService.create(feedback);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.status(Response.Status.CREATED).entity(feedback).build();
    }

    @GET
    @Path("/get-all")
    public Response getAll(@Context SecurityContext ctx) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        List<FeedbackResponseData> feedbacksData = new ArrayList<>();
        try {
            List<Feedback> feedbacks = feedbackService.getAll();
            for (Feedback feedback : feedbacks) {
                feedbacksData.add(FeedbackMapper.toDto(feedback));
            }
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(feedbacksData).build();
    }

    @GET
    @Path("/get-for-employee/{employeeId}")
    public Response getForEmployee(@Context SecurityContext ctx, @PathParam("employeeId") Long employeeId) {
        if (!ctx.isUserInRole("admin") && !Long.valueOf(ctx.getUserPrincipal().getName()).equals(employeeId)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        String valid = employeeIdValidator.validate(employeeId);
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }

        List<FeedbackResponseData> feedbacksData = new ArrayList<>();
        try {
            List<Feedback> feedbacks = feedbackService.getForEmployee(employeeId);
            for (Feedback feedback : feedbacks) {
                feedbacksData.add(FeedbackMapper.toDto(feedback));
            }
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(feedbacksData).build();
    }
}
