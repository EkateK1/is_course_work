package db;

import dto.FeedbackCreationRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import model.entities.Feedback;
import model.entities.Ingredient;
import utils.JPAUtil;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class FeedbackDAO {

    private final EntityManager em;

    public FeedbackDAO(){
        em = JPAUtil.getEntityManager();
    }

    public void insertNew(FeedbackCreationRequest feedbackData) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();

            em.createNativeQuery("SELECT create_feedback_by_table(CAST(:tableNumber AS table_number), :rating, :tip, :comment)")
                    .setParameter("tableNumber", feedbackData.tableNumber.name())
                    .setParameter("rating", feedbackData.rating)
                    .setParameter("tip", feedbackData.tipAmount)
                    .setParameter("comment", feedbackData.comment)
                    .getSingleResult();

            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public List<Feedback> getAll() {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                "SELECT f FROM Feedback f",
                Feedback.class
        ).getResultList();
    }

    public List<Feedback> getForEmployee(Long id){
        EntityManager em = JPAUtil.getEntityManager();
        List<Feedback> result = em.createQuery(
                        "SELECT f FROM Feedback f " +
                                "JOIN f.journalLog j " +
                                "WHERE j.employee.id = :employeeId " +
                                "ORDER BY f.time DESC",
                        Feedback.class
                )
                .setParameter("employeeId", id)
                .getResultList();

        return result == null ? Collections.emptyList() : result;
    }
}
