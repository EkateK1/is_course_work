package dto;

import lombok.*;
import model.entities.Dish;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DishWithIngredientsRequest {
    Dish dish;
    List<IngredientWithAmount> ingredients;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredientWithAmount {
        Long ingredientId;
        BigDecimal amount;
    }
}
