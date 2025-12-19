package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import model.entities.Employee;
import model.entities.Order;
import model.enums.OrderStatus;
import utils.JPAUtil;

import java.util.List;

@ApplicationScoped
public class OrderDAO {

    private final EntityManager em;

    public OrderDAO() {
        em = JPAUtil.getEntityManager();
    }

    public void create(Order order) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            em.persist(order);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public Order findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(Order.class, id);
    }

    public void delete(Order order) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            Order managed = em.find(Order.class, order.getId());
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

    public void modify(Order order) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            em.merge(order);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public List<Order> findAll() {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            List<Order> orders = em.createQuery(
                    "SELECT o FROM Order o",
                    Order.class
            ).getResultList();
            em.getTransaction().commit();
            return orders;
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public List<Order> findByJournalLog(Long journalLogId) {
        EntityManager em = JPAUtil.getEntityManager();
        return em
                .createQuery(
                        "SELECT o FROM Order o WHERE o.journalLog.id = :journalLogId",
                        Order.class
                )
                .setParameter("journalLogId", journalLogId)
                .getResultList();
    }

    public boolean isInBill(Order order) {
        return !em
                .createNativeQuery(
                        "SELECT 1 FROM orders_in_bill WHERE id_order = :orderId LIMIT 1"
                )
                .setParameter("orderId", order.getId())
                .getResultList()
                .isEmpty();
    }
}
