package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import model.entities.Employee;
import model.entities.JournalLog;
import model.enums.TableNumber;
import model.enums.TableStatus;
import utils.JPAUtil;

import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class JournalDAO {

    private final EntityManager em;

    public JournalDAO(){
        em = JPAUtil.getEntityManager();
    }

    public JournalLog findLastByTableNumber(TableNumber tableNumber) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "select j from JournalLog j " +
                                "where j.tableNumber = :tableNumber " +
                                "order by j.id desc", JournalLog.class)
                .setParameter("tableNumber", tableNumber)
                .setMaxResults(1)
                .getResultList()
                .stream()
                .findFirst()
                .orElse(null);
    }

    public JournalLog findLastOccupiedByTableNumber(TableNumber tableNumber) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "select j from JournalLog j " +
                                "where j.tableNumber = :tableNumber " +
                                "and j.tableStatus = :occupied " +
                                "order by j.id desc", JournalLog.class)
                .setParameter("tableNumber", tableNumber)
                .setParameter("occupied", TableStatus.occupied)  // ← добавлено
                .setMaxResults(1)
                .getResultList()
                .stream()
                .findFirst()
                .orElse(null);

    }

    public JournalLog create(Long id, TableNumber tableNumber, TableStatus tableStatus) {
        EntityManager em = JPAUtil.getEntityManager();

        try {
            em.getTransaction().begin();

            Long journalLogId = ((Number) em.createNativeQuery(
                            "select add_journal_entry(" +
                                    "  :empId, " +
                                    "  cast(:tableNumber as table_number), " +
                                    "  cast(:tableStatus as table_status)" +
                                    ")"
                    )
                    .setParameter("empId", id)
                    .setParameter("tableNumber", tableNumber.name())
                    .setParameter("tableStatus", tableStatus.name())
                    .getSingleResult()).longValue();

            JournalLog journalLog = em.find(JournalLog.class, journalLogId);

            em.getTransaction().commit();
            return journalLog;

        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }

    public List<JournalLog> getLastForHours(Integer hours) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                "select j from JournalLog j " +
                        "where j.time >= :fromTime " +
                        "order by j.time desc",
                JournalLog.class
        ).setParameter("fromTime", OffsetDateTime.now().minusHours(hours))
                .getResultList();
    }

    public JournalLog findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(JournalLog.class, id);
    }

    public void resetEmployee(Employee employee, Long journalLogId) {
        EntityManager em = JPAUtil.getEntityManager();
        em.createQuery(
                        "update JournalLog j " +
                                "set j.employee = :employeeId " +
                                "where j.id = :logId")
                .setParameter("employeeId", employee)
                .setParameter("logId", journalLogId)
                .executeUpdate();
    }

}
