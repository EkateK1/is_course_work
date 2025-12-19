package services;

import db.DishDAO;
import db.DishIngredientDAO;
import db.IngredientDAO;
import dto.DishWithIngredientsRequest;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpSession;
import model.entities.Dish;
import model.entities.DishIngredient;
import model.entities.Ingredient;

import java.math.BigDecimal;
import java.util.List;

@RequestScoped
public class DishIngredientService {

    @Inject
    IngredientDAO ingredientDAO;

    @Inject
    DishDAO dishDAO;

    @Inject
    DishIngredientDAO dishIngredientDAO;

    public void setIngredientsToDish(Dish dish, List<DishWithIngredientsRequest.IngredientWithAmount> ingredients) {
        for (DishWithIngredientsRequest.IngredientWithAmount ingr: ingredients){
            DishIngredient dishIngredient = new DishIngredient();
            dishIngredient.setDish(dish);
            Ingredient ingredient = ingredientDAO.findById(ingr.getIngredientId());
            dishIngredient.setIngredient(ingredient);
            dishIngredient.setAmount(ingr.getAmount());
            dishIngredientDAO.create(dishIngredient);
        }
    }

    public void addIngredientInDish(Long dishId, Long ingredientId, BigDecimal amount) {
        Dish dish = dishDAO.findById(dishId);
        Ingredient ingredient = ingredientDAO.findById(ingredientId);
        if (dish == null) {
            throw new IllegalArgumentException("Блюдо не найдено");
        }
        if (ingredient == null){
            throw new IllegalArgumentException("Ингредиент не найден");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0){
            throw new IllegalArgumentException("Некорректное значение amount");
        }

        DishIngredient dishIngredient = dishIngredientDAO.getRecordByIds(dishId, ingredientId);
        if (dishIngredient != null){
            throw new IllegalArgumentException("Ингредиент уже есть в блюде");
        }

        dishIngredient = new DishIngredient();
        dishIngredient.setDish(dish);
        dishIngredient.setIngredient(ingredient);
        dishIngredient.setAmount(amount);
        dishIngredientDAO.create(dishIngredient);
    }

    public void removeIngredientFromDish(Long dishId, Long ingredientId) {

        DishIngredient dishIngredient = dishIngredientDAO.getRecordByIds(dishId, ingredientId);
        if (dishIngredient == null){
            throw new IllegalArgumentException("Ингредиент не состоит в блюде");
        }

        dishIngredientDAO.delete(dishIngredient);
    }

    private Dish findDishById(Long dishId) {
        Dish dish = dishDAO.findById(dishId);
        if (dish == null) {
            throw new IllegalArgumentException("Блюдо не найдено");
        }
        return dish;
    }

    private Ingredient findIngredientById(Long ingredientId) {
        Ingredient ingredient = ingredientDAO.findById(ingredientId);
        if (ingredient == null) {
            throw new IllegalArgumentException("Ингредиент не найден");
        }
        return ingredient;
    }

    private void checkAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0){
            throw new IllegalArgumentException("Некорректное значение amount");
        }
    }
}
