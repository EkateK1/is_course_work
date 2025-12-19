package services;

import db.IngredientDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Dish;
import model.entities.Ingredient;

import java.math.BigDecimal;
import java.util.List;

@RequestScoped
public class IngredientService {

    @Inject
    IngredientDAO ingredientDAO;

    public List<Ingredient> getForDish(Long id) {
        return ingredientDAO.getForDish(id);
    }

    public void create(Ingredient ingredient) {
        ingredientDAO.create(ingredient);
    }

    public void modify(Ingredient ingredient) {
        ingredientDAO.modify(ingredient);
    }

    public void delete(Long id) {
        Ingredient ingredient = ingredientDAO.findById(id);
        ingredientDAO.delete(ingredient);
    }

    public List<Ingredient> getAll() {
        return ingredientDAO.getAll();
    }

    public void resetAmount(Long id, BigDecimal amount) {
        Ingredient ingredient = ingredientDAO.findById(id);
        if (ingredient != null) {
            ingredientDAO.resetAmount(id, amount);
        } else {
            throw new IllegalArgumentException("Ингредиент не найден");
        }
    }

    public void resetCost(Long id, BigDecimal cost) {
        if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0){
            throw new IllegalArgumentException("Цена должна быть положительной");
        }
        Ingredient ingredient = ingredientDAO.findById(id);
        if (ingredient == null) {
            throw new IllegalArgumentException("Блюдо не найдено");
        }

        try {

            ingredientDAO.resetCost(id, cost);

        } catch (Exception e) {
            Throwable cause = e;
            while (cause.getCause() != null) {
                cause = cause.getCause();
            }

            if (cause instanceof org.postgresql.util.PSQLException psqlEx) {
                String msg = psqlEx.getServerErrorMessage() != null
                        ? psqlEx.getServerErrorMessage().getMessage()
                        : psqlEx.getMessage();

                throw new IllegalArgumentException(msg);
            }

            throw e;
        }
    }
}
