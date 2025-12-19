package mappers;

import dto.EmployeeResponseData;
import model.entities.Employee;

public class EmployeeMapper {

    public static EmployeeResponseData toDto(Employee e) {
        if (e == null) return null;

        EmployeeResponseData dto = new EmployeeResponseData();
        dto.setId(e.getId());
        dto.setPositions(e.getPositions());
        dto.setName(e.getName());
        dto.setSecondName(e.getSecondName());
        dto.setPatronymic(e.getPatronymic());

        return dto;
    }
}
