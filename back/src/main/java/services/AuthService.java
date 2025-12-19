package services;

import db.EmployeeDAO;
import dto.AuthData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import model.entities.Employee;
import utils.JwtUtil;
import utils.PasswordUtil;

import java.security.SecureRandom;

@ApplicationScoped
public class AuthService {

    @Inject
    private EmployeeDAO employeeDAO;

    private static final SecureRandom RANDOM = new SecureRandom();

    private String generateCode() {
        int codeInt = RANDOM.nextInt(1000);
        return String.format("%03d", codeInt);
    }

    public AuthData register(Employee employee) {
        String code = generateCode();
        String hash = PasswordUtil.hash(code);

        employee.setPassword(hash);

        employeeDAO.save(employee);

        return new AuthData(employee.getId(), code);
    }

    public String login(Long employeeId, String code) {
        Employee e = employeeDAO.findById(employeeId);
        if (e == null) {
            throw new IllegalArgumentException("Сотрудник не найден");
        }

        if (!PasswordUtil.check(code, e.getPassword())) {
            throw new IllegalArgumentException("Код не валиден");
        }

        return JwtUtil.generateToken(e.getId(), e.getPositions().getValue());
    }

    public void delete(Employee employee) {
        employeeDAO.delete(employee);
    }

}
