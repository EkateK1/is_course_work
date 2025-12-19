package services;

import db.EmployeeDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Employee;

import java.util.List;
import java.util.Objects;

@RequestScoped
public class EmployeeService {

    @Inject
    EmployeeDAO employeeDAO;

    public void delete(Long id) {
        Employee employee = getById(id);
        employeeDAO.delete(employee);
    }

    public void modify(Employee employee) {
        Employee oldEmployee = getById(employee.getId());
        if (employee.getPassword() == null || Objects.equals(oldEmployee.getPassword(), employee.getPassword())) {
            employee.setPassword(oldEmployee.getPassword());
            employeeDAO.modify(employee);
        } else {
            throw new IllegalArgumentException("Таким запросом нельзя изменить пароль сотрудника");
        }
    }

    public Employee getById(Long id) {
        return employeeDAO.findById(id);
    }

    public List<Employee> getAll(){
        return employeeDAO.findAll();
    }
}
