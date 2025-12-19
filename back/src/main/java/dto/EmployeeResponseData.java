package dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import model.entities.Employee;
import model.enums.Positions;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseData {
    private Long id;
    private Positions positions;
    private String name;
    private String secondName;
    private String patronymic;
}
