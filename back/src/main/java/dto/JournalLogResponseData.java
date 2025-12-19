package dto;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import model.entities.Employee;
import model.enums.TableNumber;
import model.enums.TableStatus;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JournalLogResponseData {

    private Long id;

    private TableStatus tableStatus;

    private EmployeeResponseData employee;

    private TableNumber tableNumber;

    private String time;
}
