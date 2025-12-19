package services;

import db.EmployeeDAO;
import db.ReportDAO;
import dto.EmployeeResponseData;
import dto.reports.EmployeeReportData;
import dto.reports.MainReportData;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import mappers.EmployeeMapper;
import model.entities.Bill;
import model.entities.Employee;
import model.entities.Feedback;
import model.entities.Order;
import model.enums.BillStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequestScoped
public class ReportService {

    @Inject
    ReportDAO reportDAO;

    @Inject
    EmployeeDAO employeeDAO;

    @Transactional
    public MainReportData mainReport(LocalDate date) {
        OffsetDateTime fromDateTime = date.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
        List<Order> orders = reportDAO.getOrdersFromDate(fromDateTime);
        List<Bill> bills = reportDAO.getBillsFromDate(fromDateTime);

        MainReportData report = new MainReportData();
        report.setOrdersSum(calculateOrdersSum(orders));
        report.setPrimeCostSum(calculatePrimeCostSum(orders));

        report.setOrdersAmount(orders.size());
        report.setPaidOrdersAmount(calculatePaidOrders(bills));
        Integer notPaid = orders.size() - report.getPaidOrdersAmount();
        report.setNotPaidOrdersAmount(notPaid > 0 ? notPaid : 0);

        return report;
    }

    @Transactional
    public Map<Long, EmployeeReportData> employeeAllReport(LocalDate date) {
        Map<Long, EmployeeReportData> result = new HashMap<>();
        List<Employee> employees = employeeDAO.findAll();
        for (Employee employee : employees) {
            result.put(employee.getId(), employeeReport(employee.getId(), date));
        }
        return result;
    }

    public EmployeeReportData employeeReport(Long id, LocalDate date) {
        OffsetDateTime fromDateTime = date.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
        EmployeeReportData employeeReportData = new EmployeeReportData();
        List<Order> orders = reportDAO.getOrdersFromDateAndEmployee(fromDateTime, id);
        List<Feedback> feedbacks = reportDAO.getFeedbackForEmployee(fromDateTime, id);

        employeeReportData.setOrdersAmount(orders.size());
        employeeReportData.setOrdersSum(calculateOrdersSum(orders));
        employeeReportData.setTableAmount(reportDAO.getTableAmountForEmployee(fromDateTime, id));
        if (feedbacks != null && !feedbacks.isEmpty()) {
            employeeReportData.setRating(countRating(feedbacks));
            employeeReportData.setComments(getComments(feedbacks));
        }
        return employeeReportData;
    }

    private Double countRating(List<Feedback> feedbacks) {
        Double sum = 0.0;
        Double count = 0.0;
        for (Feedback feedback : feedbacks) {
            sum += feedback.getRating();
            count++;
        }
        return sum / count;
    }

    private List<String> getComments(List<Feedback> feedbacks){
        List<String> comments = new ArrayList<>();
        for (Feedback feedback : feedbacks) {
            if (feedback.getComment() != null) {
                comments.add(feedback.getComment().getBody());
            }
        }
        return comments;
    }

    private BigDecimal calculateOrdersSum(List<Order> orders) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Order order : orders) {
            sum = sum.add(order.getDish().getCost());
        }
        return sum;
    }

    private BigDecimal calculatePrimeCostSum(List<Order> orders) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Order order : orders) {
            sum = sum.add(order.getDish().getPrimeCost());
        }
        return sum;
    }

    private Integer calculatePaidOrders(List<Bill> bills) {
        Integer paidOrders = 0;
        for (Bill bill : bills) {
            if (bill.getBillStatus() == BillStatus.paid){
                paidOrders += reportDAO.getOrdersAmountInBill(bill);
            }
        }
        return paidOrders;
    }

}
