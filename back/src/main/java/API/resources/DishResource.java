package API.resources;

import dto.DishIngredientData;
import dto.DishWithIngredientsRequest;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import model.entities.Dish;
import services.DishIngredientService;
import services.DishService;
import validation.DishValidator;
import validation.IngredientValidator;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Path("/dish")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class DishResource {

    @Inject
    DishService dishService;

    @Inject
    DishValidator dishValidator;

    @Inject
    IngredientValidator ingredientValidator;

    @Inject
    DishIngredientService dishIngredientService;

    @GET
    @Path("/get-all")
    public Response getAll() {
        List<Dish> dishes;
        try {
            dishes = dishService.getAll();
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok(dishes).build();
    }

    @POST
    @Path("/create")
    public Response create(@Context SecurityContext ctx,
                           @NotNull(message = "Body is null") DishWithIngredientsRequest dishRequest) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        String valid = dishValidator.validate(dishRequest.getDish());
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }

        if (dishRequest.getIngredients() == null || dishRequest.getIngredients().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Список ингредиентов блюда отсутствует").build();
        }
        for (DishWithIngredientsRequest.IngredientWithAmount ingredient : dishRequest.getIngredients()) {
            valid = ingredientValidator.validate(ingredient);
            if (!valid.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
            }
        }

        try {
            Dish dish = dishService.create(dishRequest.getDish());
            dishIngredientService.setIngredientsToDish(dish, dishRequest.getIngredients());
        } catch (IllegalArgumentException | ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @POST
    @Path("/modify-dish")
    public Response modifyDish(@Context SecurityContext ctx,
                           @NotNull(message = "Body is null") @Valid Dish dish) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        if (dish.getId() == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Отсутствует id").build();
        }
        String valid = dishValidator.validate(dish);
        if (!valid.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(valid).build();
        }
        try {
            dishService.modify(dish);
        } catch (IllegalArgumentException | ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
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
            dishService.resetCost(id, cost);
        } catch (IllegalArgumentException e){
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e){
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @POST
    @Path("/add-ingredient")
    public Response addIngredient(@Context SecurityContext ctx,
                                  @NotNull(message = "Body is null") DishIngredientData dishIngredientData) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            dishIngredientService.addIngredientInDish(dishIngredientData.getDishId(),
                    dishIngredientData.getIngredientId(), dishIngredientData.getAmount());

        } catch (IllegalArgumentException | ConstraintViolationException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

    @POST
    @Path("/remove-ingredient")
    public Response removeIngredient(@Context SecurityContext ctx,
                                  @NotNull(message = "Body is null") DishIngredientData dishIngredientData) {
        if (!ctx.isUserInRole("admin")) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            dishIngredientService.removeIngredientFromDish(dishIngredientData.getDishId(),
                    dishIngredientData.getIngredientId());

        } catch (IllegalArgumentException | ConstraintViolationException e) {
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
            dishService.delete(id);
        } catch (Exception e){
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
        return Response.ok().build();
    }

}
