package validation;

import db.IngredientDAO;
import dto.DishWithIngredientsRequest;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotNull;
import model.entities.Dish;
import model.entities.Ingredient;

import java.math.BigDecimal;
import java.util.Objects;

@RequestScoped
public class IngredientValidator {

    @Inject
    IngredientDAO ingredientDAO;

    public String validate(Ingredient ingredient) {
        String result = "";
        result += validateName(ingredient);
        return result;
    }

    private String validateName(Ingredient ingredient) {
        Ingredient oldIngredient = ingredientDAO.findByName(ingredient.getName());
        if (oldIngredient != null && !Objects.equals(ingredient.getId(), oldIngredient.getId())) {
            return "Ингредиент с таким названием уже существует\n";
        }
        return "";
    }

    public String validate(DishWithIngredientsRequest.IngredientWithAmount ingredient) {
        String result = "";
        result += validateIngredient(ingredient.getIngredientId());
        result += validateAmount(ingredient.getAmount());
        return result;
    }

    private String validateIngredient(Long id) {
        if (ingredientDAO.findById(id) == null) {
            return "Ингредиент с таким id не существует\n";
        }
        return "";
    }

    private String validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return "Количество должно быть положительным\n";
        }
        return "";
    }
}
