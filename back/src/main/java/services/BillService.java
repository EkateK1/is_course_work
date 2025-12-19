package services;

import db.BillDAO;
import dto.BillCreationRequest;
import dto.JournalData;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Bill;
import model.entities.Employee;
import model.entities.JournalLog;
import model.enums.TableNumber;
import model.enums.TableStatus;

@RequestScoped
public class BillService {

    @Inject
    private BillDAO billDAO;

    @Inject
    private JournalService journalService;


    // отлов ошибки из бд
    public Long createBill(BillCreationRequest request) {

        TableNumber tableNumber = request.getTableNumber();
        Short guestNumber = request.getGuestNumber();

        JournalLog lastLog = journalService.getLastLogForTableNumber(tableNumber);
        if (lastLog == null) {
            throw new IllegalStateException("Для стола " + tableNumber + " нет записей в журнале");
        }

        Employee employee = lastLog.getEmployee();
        if (employee == null) {
            throw new IllegalStateException(
                    "Для стола " + tableNumber + " не найден сотрудник в последней записи журнала"
            );
        }


        if (lastLog.getTableStatus() == TableStatus.not_paid) {
            lastLog = journalService.getLastOccupiedLogForTableNumber(tableNumber);
        }

        JournalData journalData = new JournalData();
        journalData.setEmployeeId(employee.getId());
        journalData.setTableNumber(tableNumber);
        journalData.setTableStatus(TableStatus.not_paid);
        try {

            if (journalService.getLastLogForTableNumber(tableNumber).getTableStatus() != TableStatus.not_paid) {
                journalService.create(journalData);
            }
            return billDAO.createBillForTableGuest(tableNumber, guestNumber);

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


    public Bill getBill(Long billId) {
        return billDAO.findById(billId);
    }


    public boolean payBill(Long billId) {

        Bill bill = billDAO.findById(billId);
        if (bill == null) {
            return false;
        }


        TableNumber tableNumber = billDAO.findTableNumberByBillId(billId);
        if (tableNumber == null) {
            throw new IllegalStateException("Не удалось определить номер стола для счёта id = " + billId);
        }


        Employee employee = journalService.getEmployee(tableNumber);
        if (employee == null) {
            throw new IllegalStateException("Для стола " + tableNumber + " не найден сотрудник в журнале");
        }

        JournalData journalData = new JournalData();
        journalData.setEmployeeId(employee.getId());
        journalData.setTableNumber(tableNumber);

        boolean result = billDAO.markAsPaid(billId);

        long openBills = billDAO.countOpenBillsForTable(tableNumber);
        long ordersWithoutBill = billDAO.countOrdersWithoutBillForTable(tableNumber);

        if (openBills == 0 && ordersWithoutBill == 0 && result) {
            journalData.setTableStatus(TableStatus.paid);
            journalService.create(journalData);
        }
        return result;
    }

    public TableNumber getTableNumberForBill(Long billId) {
        return billDAO.findTableNumberByBillId(billId);
    }

    public int calculateBonus(Long billId, boolean isBirthday) {
        Bill bill = billDAO.findById(billId);
        if (bill == null) {
            throw new IllegalArgumentException("Счёт не найден: " + billId);
        }

        int base = bill.getBonusPoints();
        int extra = 0;
        if (isBirthday) {
            extra = 20;
        }
        return base + extra;
    }
}
