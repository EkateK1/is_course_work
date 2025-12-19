package services;

import db.DishDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Dish;

import java.math.BigDecimal;
import java.util.List;

@RequestScoped
public class DishService {

    @Inject
    DishDAO dishDAO;

    public List<Dish> getAll() {
        return dishDAO.getAll();
    }

    public Dish create(Dish dish) {
        return dishDAO.create(dish);
    }

    public void delete(Long id) {
        Dish dish = dishDAO.findById(id);
        dishDAO.delete(dish);
    }

    public void modify(Dish dish) {
        dishDAO.modify(dish);
    }

    public void resetCost(Long id, BigDecimal cost) {
        if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0){
            throw new IllegalArgumentException("Цена должна быть положительной");
        }
        Dish dish = dishDAO.findById(id);
        if (dish == null) {
            throw new IllegalArgumentException("Блюдо не найдено");
        }

        try {

            dishDAO.resetCost(id, cost);

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
