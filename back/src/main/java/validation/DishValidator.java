package validation;

import db.DishDAO;
import dto.DishIngredientData;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Dish;
import model.entities.Ingredient;

import java.util.Objects;

@RequestScoped
public class DishValidator {

    @Inject
    DishDAO dishDAO;

    public String validate(Dish dish) {
        String result = "";
        result += validateName(dish);
        return result;
    }

    private String validateName(Dish dish) {
        Dish oldDish = dishDAO.findByName(dish.getName());
        if (oldDish != null && !Objects.equals(oldDish.getId(), dish.getId())) {
            return "Блюдо с таким названием уже существует\n";
        }
        return "";
    }
}
