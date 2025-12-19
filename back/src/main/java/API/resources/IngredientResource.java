package API.resources;

import jakarta.inject.Inject;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.*;
import model.entities.Ingredient;
import services.IngredientService;
import validation.IngredientValidator;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Path("/ingredient")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class IngredientResource {

    @Inject
    IngredientService ingredientService;
    @Inject
    IngredientValidator ingredientValidator;

    @GET
    @Path("/get-for-dish/{id}")
    public Response getForDish(@PathParam("id") Long id) {
        List<Ingredient> ingredients = ingredientService.getForDish(id);
        if (ingredients == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(ingredients).build();
    }

    @POST
    @Path("/create")
    public Response create(@Context SecurityContext ctx,
                           @NotNull(message = "Body is null") @Valid Ingredient ingredient) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        String valid = ingredientValidator.validate(ingredient);
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }
        try{
            ingredientService.create(ingredient);
        } catch (ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(ingredient).build();
    }

    @POST
    @Path("/modify")
    public Response modify(@Context SecurityContext ctx,
                           @NotNull(message = "Body is null") @Valid Ingredient ingredient) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        String valid = ingredientValidator.validate(ingredient);
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }
        try{
            ingredientService.modify(ingredient);
        } catch (ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(ingredient).build();
    }

    @DELETE
    @Path("/delete/{id}")
    public Response delete(@Context SecurityContext ctx, @PathParam("id") Long id) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try{
            ingredientService.delete(id);
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @GET
    @Path("/get-all")
    public Response getAll() {
        List<Ingredient> ingredients;
        try {
            ingredients = ingredientService.getAll();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(ingredients).build();
    }

    @POST
    @Path("/increase-amount")
    public Response resetAmount(@Context SecurityContext ctx,
                                @NotNull(message = "Body is null") Map<String, Object> body) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        Long id = ((Number) body.get("id")).longValue();
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        try{
            ingredientService.resetAmount(id, amount);
        } catch (ConstraintViolationException | IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @POST
    @Path("/reset-cost")
    public Response resetCost(@Context SecurityContext ctx,
                              @NotNull(message = "Body is null") Map<String, Object> body) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        Long id = ((Number) body.get("id")).longValue();
        BigDecimal cost = new BigDecimal(body.get("cost").toString());
        try {
            ingredientService.resetCost(id, cost);
        } catch (IllegalArgumentException e){
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e){
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }
}
