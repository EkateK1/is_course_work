package dto.reports;

import dto.EmployeeResponseData;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeReportData {
    Integer ordersAmount;
    BigDecimal ordersSum;
    Integer tableAmount; // считает количество столов paid
    Double rating;
    List<String> comments;
}
