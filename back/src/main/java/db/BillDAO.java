package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import model.entities.Bill;
import model.enums.BillStatus;
import model.enums.TableNumber;
import utils.JPAUtil;

@ApplicationScoped
public class BillDAO {

    private EntityManager em;

    public BillDAO() {
        this.em = JPAUtil.getEntityManager();
    }

    //счет ч/з бд ф-ю, возвращает id счета
    public Long createBillForTableGuest(TableNumber tableNumber, Short guestNumber) {
        EntityManager em = JPAUtil.getEntityManager();
        EntityTransaction tx = em.getTransaction();
        try {
            tx.begin();

            Object result = em.createNativeQuery(
                            "SELECT create_bill_for_table_guest(" +
                                    ":tableNumber, " +
                                    ":guestNumber" +
                                    ")"
                    )
                    .setParameter("tableNumber", tableNumber.name())
                    .setParameter("guestNumber", guestNumber)
                    .getSingleResult();

            tx.commit();


            return ((Number) result).longValue();
        } catch (RuntimeException e) {
            if (tx.isActive()) {
                tx.rollback();
            }
            throw e;
        }
    }

    public Bill findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(Bill.class, id);
    }

    //оплата закрытого счета
    public boolean markAsPaid(Long billId) {
        EntityManager em = JPAUtil.getEntityManager();
        EntityTransaction tx = em.getTransaction();
        try {
            tx.begin();

            int updated = em.createQuery(
                            "UPDATE Bill b SET b.billStatus = :paid " +
                                    "WHERE b.id = :id AND b.billStatus = :open")
                    .setParameter("paid", BillStatus.paid)
                    .setParameter("open", BillStatus.open)
                    .setParameter("id", billId)
                    .executeUpdate();

            tx.commit();
            return updated > 0;
        } catch (RuntimeException e) {
            if (tx.isActive()) {
                tx.rollback();
            }
            throw e;
        }
    }

    //для контроля номера оплаченного стола: вытаскивает номер стола по номеру счета
    public TableNumber findTableNumberByBillId(Long billId) {
        EntityManager em = JPAUtil.getEntityManager();
        String sql = """
                SELECT jl.table_number
                FROM bill b
                JOIN orders_in_bill oib ON oib.id_bill = b.id
                JOIN orders o           ON o.id = oib.id_order
                JOIN journal_log jl     ON jl.id = o.id_journal_log
                WHERE b.id = :id
                LIMIT 1
                """;

        Object result;
        try {
            result = em.createNativeQuery(sql)
                    .setParameter("id", billId)
                    .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            return null;
        }

        return TableNumber.valueOf(result.toString());
    }




    public long countOpenBillsForTable(TableNumber tableNumber) {
        EntityManager em = JPAUtil.getEntityManager();
        String sql = """
        SELECT COALESCE(COUNT(DISTINCT b.id), 0)
        FROM bill b
        JOIN orders_in_bill oib ON oib.id_bill = b.id
        JOIN orders o          ON o.id = oib.id_order
        JOIN journal_log jl    ON jl.id = o.id_journal_log
        WHERE jl.table_number = :table
          AND b.bill_status = 'open'
        """;
        Number n = (Number) em.createNativeQuery(sql)
                .setParameter("table", tableNumber.name())
                .getSingleResult();
        return n.longValue();
    }

    public long countOrdersWithoutBillForTable(TableNumber tableNumber) {
        EntityManager em = JPAUtil.getEntityManager();
        String sql = """
        SELECT COALESCE(COUNT(*), 0)
        FROM orders o
        JOIN journal_log jl ON jl.id = o.id_journal_log
        WHERE jl.table_number = :table
          AND NOT EXISTS (
              SELECT 1 FROM orders_in_bill oib WHERE oib.id_order = o.id
          )
        """;
        Number n = (Number) em.createNativeQuery(sql)
                .setParameter("table", tableNumber.name())
                .getSingleResult();
        return n.longValue();
    }



}

//todo вручную добавлять запись в журнал об изменении статуса стола?

