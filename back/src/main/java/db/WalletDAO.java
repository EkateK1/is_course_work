package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.RequestScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import model.entities.Wallet;
import utils.JPAUtil;

import java.math.BigDecimal;

@ApplicationScoped
public class WalletDAO {

    private final EntityManager em;

    public WalletDAO(){
        em = JPAUtil.getEntityManager();
    }

    public Wallet findByEmployeeId(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                        "SELECT w FROM Wallet w WHERE w.employee.id = :empId",
                        Wallet.class
                )
                .setParameter("empId", id)
                .getSingleResult();
    }

    //баланс
    public BigDecimal getBalanceOrNull(Long employeeId) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            Wallet wallet = em.createQuery(
                            "SELECT w FROM Wallet w WHERE w.employee.id = :empId",
                            Wallet.class
                    )
                    .setParameter("empId", employeeId)
                    .getSingleResult();
            em.refresh(wallet);
            BigDecimal balance = wallet.getBalance();
            em.getTransaction().commit();
            return balance;
        } catch (NoResultException e) {
            em.getTransaction().rollback();
            return null;
        } catch (Exception e) {
            em.getTransaction().rollback();
            return null;
        }
    }

    //снятие денег
    public void withdrawal(Long employeeId, BigDecimal amount) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();

            em.createNativeQuery("SELECT wallet_withdraw(:empId, :amount)")
                    .setParameter("empId", employeeId)
                    .setParameter("amount", amount)
                    .getSingleResult();

            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void create(Wallet wallet) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.persist(wallet);
            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public void deleteWalletByEmployeeId(Long employeeId) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();

            em.createQuery(
                            "DELETE FROM Wallet w WHERE w.employee.id = :employeeId"
                    )
                    .setParameter("employeeId", employeeId)
                    .executeUpdate();

            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }


}
