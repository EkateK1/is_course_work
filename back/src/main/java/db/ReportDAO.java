package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import model.entities.Bill;
import model.entities.Feedback;
import model.entities.JournalLog;
import model.entities.Order;
import model.enums.TableStatus;
import utils.JPAUtil;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class ReportDAO {

    public List<Order> getOrdersFromDate(OffsetDateTime fromDateTime) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "select f from Order f " +
                                "where f.time >= :fromTime " +
                                "order by f.time asc",
                        Order.class
                )
                .setParameter("fromTime", fromDateTime)
                .getResultList();
    }

    public List<Bill> getBillsFromDate(OffsetDateTime fromDateTime) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "select f from Bill f " +
                                "where f.time >= :fromTime " +
                                "order by f.time asc",
                        Bill.class
                )
                .setParameter("fromTime", fromDateTime)
                .getResultList();
    }

    public Integer getOrdersAmountInBill(Bill bill) {
        EntityManager em = JPAUtil.getEntityManager();
        Number result = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM orders_in_bill WHERE id_bill = :billId"
                )
                .setParameter("billId", bill.getId())
                .getSingleResult();

        return result.intValue();
    }

    public List<Order> getOrdersFromDateAndEmployee(OffsetDateTime fromDateTime, Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "select f from Order f " +
                                "join f.journalLog j " +
                                "where f.time >= :fromTime " +
                                "and j.employee.id = :employeeId " +
                                "order by f.time asc",
                        Order.class
                )
                .setParameter("fromTime", fromDateTime)
                .setParameter("employeeId", id)
                .getResultList();

    }

    public Integer getTableAmountForEmployee(OffsetDateTime fromDateTime, Long employeeId) {
        EntityManager em = JPAUtil.getEntityManager();
        Number result = (Number) em.createQuery(
                        "select COUNT(j) from JournalLog j " +
                                "where j.employee.id = :employeeId " +
                                "and j.tableStatus = :status " +
                                "and j.time > :fromTime"
                )
                .setParameter("employeeId", employeeId)
                .setParameter("status", TableStatus.paid)
                .setParameter("fromTime", fromDateTime)
                .getSingleResult();
        return result.intValue();
    }

    public List<Feedback> getFeedbackForEmployee(OffsetDateTime date, Long id){
        EntityManager em = JPAUtil.getEntityManager();
        List<Feedback> result = em.createQuery(
                        "SELECT f FROM Feedback f " +
                                "JOIN f.journalLog j " +
                                "WHERE j.employee.id = :employeeId " +
                                "AND f.time > :fromTime " +
                                "ORDER BY f.time DESC",
                        Feedback.class
                )
                .setParameter("employeeId", id)
                .setParameter("fromTime", date)
                .getResultList();

        return result == null ? Collections.emptyList() : result;
    }
}
