package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import model.entities.Dish;
import model.entities.Employee;
import model.entities.Wallet;
import utils.JPAUtil;

import java.util.List;

@ApplicationScoped
public class EmployeeDAO {

    @Inject
    WalletDAO walletDAO;

    private final EntityManager em;

    public EmployeeDAO(){
        em = JPAUtil.getEntityManager();
    }

    public void save(Employee e) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.persist(e);
            em.getTransaction().commit();
        } catch (Exception ex) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw ex;
        }
    }

    public Employee findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        return em.find(Employee.class, id);
    }

    // todo доделать удаление
    public void delete(Employee employee) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            walletDAO.deleteWalletByEmployeeId(employee.getId());
            Employee managed = em.find(Employee.class, employee.getId());
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

    public void modify(Employee employee) {
        EntityManager em = JPAUtil.getEntityManager();
        em.getTransaction();
        try {
            em.getTransaction().begin();
            em.merge(employee);
            em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        }
    }

    public List<Employee> findAll() {
        EntityManager em = JPAUtil.getEntityManager();
        return em.createQuery(
                "SELECT e FROM Employee e",
                Employee.class
        ).getResultList();
    }
}
