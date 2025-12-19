package dto;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;
import model.enums.TableNumber;
import model.enums.TableStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JournalData {
    Long employeeId;
    @Enumerated(EnumType.STRING)
    TableNumber tableNumber;
    @Enumerated(EnumType.STRING)
    TableStatus tableStatus;
}
