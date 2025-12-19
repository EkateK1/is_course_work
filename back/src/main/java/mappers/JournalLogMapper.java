package mappers;

import dto.JournalLogResponseData;
import model.entities.JournalLog;

import java.time.format.DateTimeFormatter;

public class JournalLogMapper {

    public static JournalLogResponseData toDto(JournalLog e) {
        if (e == null) return null;

        JournalLogResponseData dto = new JournalLogResponseData();
        dto.setId(e.getId());
        dto.setTableStatus(e.getTableStatus());
        dto.setTableNumber(e.getTableNumber());
        dto.setEmployee(EmployeeMapper.toDto(e.getEmployee()));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        dto.setTime(e.getTime().toLocalDateTime().format(fmt));

        return dto;
    }
}
