package dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DishIngredientData {
    Long dishId;
    Long ingredientId;
    BigDecimal amount;
}
