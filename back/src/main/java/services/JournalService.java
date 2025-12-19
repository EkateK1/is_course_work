package services;

import db.BillDAO;
import db.EmployeeDAO;
import db.JournalDAO;
import dto.JournalData;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Employee;
import model.entities.JournalLog;
import model.entities.Order;
import model.enums.TableNumber;
import model.enums.TableStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequestScoped
public class JournalService {

    @Inject
    JournalDAO journalDAO;

    @Inject
    OrderService orderService;

    @Inject
    EmployeeDAO employeeDAO;
    @Inject
    BillDAO billDAO;

    public JournalLog create(JournalData journalData) throws IllegalArgumentException {
        TableStatus tableStatus = getTableStatusOrNull(journalData.getTableNumber());

        if (tableStatus == null && journalData.getTableStatus() != TableStatus.free) {
            throw new IllegalArgumentException("Для этого стола нет записей в журнале логов");
        }

        if (tableStatus == null && journalData.getTableStatus() == TableStatus.free){
            createRecord(journalData.getEmployeeId(), journalData.getTableNumber(), journalData.getTableStatus());
            return null;
        }

        switch (journalData.getTableStatus()) {
            case free -> {
                if (tableStatus == TableStatus.occupied) {
                    List<Order> orders = orderService.getLastForTable(journalData.getTableNumber());
                    if (orders.isEmpty()) {
                        return createRecord(journalData.getEmployeeId(), journalData.getTableNumber(), journalData.getTableStatus());
                    }
                    throw new IllegalArgumentException("Нельзя освободить стол, на который созданы заказы");
                }
                if (tableStatus != TableStatus.paid) {
                    throw new IllegalArgumentException("Стол должен быть оплачен перед освобождением");
                }
            }
            case occupied -> {
                if (tableStatus != TableStatus.free) {
                    throw new IllegalArgumentException("Стол должен быть освобожден прежде чем его займут");
                }
            }
            case not_paid -> {
                if (tableStatus != TableStatus.occupied) {
                    throw new IllegalArgumentException("На столе должны быть заказы, чтобы сформировать счет");
                }
            }
            case paid -> {
                if (tableStatus != TableStatus.not_paid) {
                    throw new IllegalArgumentException("На столе должен быть сформирован счет, чтобы он был оплачен");
                }
            }
        }

        return createRecord(journalData.getEmployeeId(), journalData.getTableNumber(), journalData.getTableStatus());
    }

    public TableStatus getTableStatus(TableNumber tableNumber) {
        JournalLog journalLog = getLastLogForTableNumber(tableNumber);
        if (journalLog == null) {
            throw new IllegalArgumentException("Для этого стола нет записей в журнале логов");
        }
        return journalLog.getTableStatus();
    }

    public Map<TableNumber, TableStatus> getTableStatuses() {
        Map<TableNumber, TableStatus> tableStatuses = new HashMap<>();
        for (TableNumber tableNumber : TableNumber.values()) {
            JournalLog journalLog = getLastLogForTableNumber(tableNumber);
            if (journalLog == null) {
                tableStatuses.put(tableNumber, null);
            } else {
                tableStatuses.put(tableNumber, journalLog.getTableStatus());
            }
        }
        return tableStatuses;
    }

    public Employee getEmployee(TableNumber tableNumber) {
        JournalLog journalLog = getLastLogForTableNumber(tableNumber);
        if (journalLog == null) {
            return null;
        }
        return journalLog.getEmployee();
    }

    public void resetEmployee(Long id, TableNumber tableNumber) throws IllegalArgumentException {
        Employee employee = employeeDAO.findById(id);
        if (employee == null) {
            throw new IllegalArgumentException("Сотрудник с заданным id не найден");
        }
        JournalLog journalLog = getLastLogForTableNumber(tableNumber);
        if (journalLog == null) {
            throw new IllegalArgumentException("Для этого стола нет записей в журнале логов");
        }

        journalDAO.resetEmployee(employee, journalLog.getId());
    }

    public List<JournalLog> getLastForHours(Integer hours){
        return journalDAO.getLastForHours(hours);
    }

    public JournalLog getLastLogForTableNumber(TableNumber tableNumber) {
        return journalDAO.findLastByTableNumber(tableNumber);
    }

    public JournalLog getLastOccupiedLogForTableNumber(TableNumber tableNumber) {
        return journalDAO.findLastOccupiedByTableNumber(tableNumber);
    }

    private TableStatus getTableStatusOrNull(TableNumber tableNumber) {
        JournalLog journalLog = getLastLogForTableNumber(tableNumber);
        if (journalLog == null) {
            return null;
        }
        return journalLog.getTableStatus();
    }

    private JournalLog createRecord(Long id, TableNumber tableNumber, TableStatus tableStatus) {
        try {

            return journalDAO.create(id, tableNumber, tableStatus);

        } catch (Exception e) {
            Throwable cause = e;
            while (cause.getCause() != null) {
                cause = cause.getCause();
            }

            if (cause instanceof org.postgresql.util.PSQLException psqlEx) {
                String msg = psqlEx.getServerErrorMessage() != null
                        ? psqlEx.getServerErrorMessage().getMessage()
                        : psqlEx.getMessage();

                throw new IllegalArgumentException(msg);
            }

            throw e;
        }
    }

    public JournalLog getBiId(Long journalLogId) {
        return journalDAO.findById(journalLogId);
    }
}
