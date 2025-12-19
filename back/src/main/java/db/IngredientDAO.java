package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import model.entities.Dish;
import model.entities.Ingredient;
import utils.JPAUtil;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class IngredientDAO {

    private final EntityManager em;

    public IngredientDAO(){
        em = JPAUtil.getEntityManager();
    }

    public List<Ingredient> getForDish(Long dishId) {
        EntityManager em = JPAUtil.getEntityManager();
        TypedQuery<Ingredient> q = em.createQuery(
                "SELECT di.ingredient FROM DishIngredient di " +
                        "JOIN di.dish d " +
                        "JOIN di.ingredient i " +
                        "WHERE d.id = :id", Ingredient.class);

        q.setParameter("id", dishId);

        return q.getResultList();
    }

    public Ingredient findByName(String name) {
        EntityManager em = JPAUtil.getEntityManager();
        List<Ingredient> results = em.createQuery(
                        "SELECT i FROM Ingredient i WHERE i.name = :name",
                        Ingredient.class
                )
                .setParameter("name", name)
                .setMaxResults(1)
                .getResultList();

        return results.isEmpty() ? null : results.get(0);
    }

    public void create(Ingredient ingredient) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.persist(ingredient);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void modify(Ingredient ingredient) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.merge(ingredient);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void delete(Ingredient ingredient) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            Ingredient managed = em.find(Ingredient.class, ingredient.getId());
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

    public List<Ingredient> getAll() {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                "SELECT i FROM Ingredient i",
                Ingredient.class
        ).getResultList();
    }

    public Ingredient findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(Ingredient.class, id);
    }

    public void resetAmount(Long id, BigDecimal amount) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();

            em.createNativeQuery("SELECT ingredient_change_amount(:id, :delta)")
                    .setParameter("id", id)
                    .setParameter("delta", amount)
                    .getSingleResult();

            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void resetCost(Long id, BigDecimal cost) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();

            em.createNativeQuery("SELECT set_ingredient_price(:id, :cost)")
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
