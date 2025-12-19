package validation;

import db.EmployeeDAO;
import dto.JournalData;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Employee;

@RequestScoped
public class EmployeeIdValidator {

    @Inject
    EmployeeDAO employeeDAO;

    public String validate(Long employeeId) {
        String result = "";
        result += validateEmployeeId(employeeId);
        return result;
    }

    private String validateEmployeeId(Long id){
        Employee employee = employeeDAO.findById(id);
        if (employee == null) {
            return "Не найден сотрудник с таким id\n";
        }
        return "";
    }
}
