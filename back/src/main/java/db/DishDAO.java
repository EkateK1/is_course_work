package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import model.entities.Dish;
import model.entities.DishIngredient;
import model.entities.Ingredient;
import utils.JPAUtil;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class DishDAO {

    private final EntityManager em;

    public DishDAO(){
        em = JPAUtil.getEntityManager();
    }

    public List<Dish> getAll() {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                "SELECT d FROM Dish d",
                Dish.class
        ).getResultList();
    }

    public Dish create(Dish dish) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.persist(dish);
            em.getTransaction().commit();
            return dish;
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void delete(Dish dish) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            Dish managed = em.find(Dish.class, dish.getId());
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

    public void modify(Dish dish) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.merge(dish);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public Dish findByName(String name) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            List<Dish> results = em.createQuery(
                            "SELECT i FROM Dish i WHERE i.name = :name",
                            Dish.class
                    )
                    .setParameter("name", name)
                    .setMaxResults(1)
                    .getResultList();

            return results.isEmpty() ? null : results.get(0);
        } catch (NoResultException e) {
            return null;
        }
    }

    public Dish findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(Dish.class, id);
    }

    public void resetCost(Long id, BigDecimal cost) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();

            em.createNativeQuery("SELECT set_dish_cost(:id, :cost)")
                    .setParameter("id", id)
                    .setParameter("cost", cost)
                    .getSingleResult();

            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }
}
