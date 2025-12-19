package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import model.entities.Dish;
import model.entities.DishIngredient;
import model.entities.Wallet;
import utils.JPAUtil;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class DishIngredientDAO {

    private final EntityManager em;

    public DishIngredientDAO(){
        em = JPAUtil.getEntityManager();
    }

    public void create(DishIngredient dish) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.persist(dish);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void delete(DishIngredient dish) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            DishIngredient managed = em.find(DishIngredient.class, dish.getId());
            if (managed != null) {
                em.remove(managed);
            }
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public DishIngredient getRecordByIds(Long dishId, Long ingredientId) {
        EntityManager em = JPAUtil.getEntityManager();
        List<DishIngredient> list = em.createQuery(
                        "SELECT di FROM DishIngredient di " +
                                "WHERE di.dish.id = :dishId AND di.ingredient.id = :ingredientId",
                        DishIngredient.class
                )
                .setParameter("dishId", dishId)
                .setParameter("ingredientId", ingredientId)
                .getResultList();

        return list.isEmpty() ? null : list.get(0);
    }
}
