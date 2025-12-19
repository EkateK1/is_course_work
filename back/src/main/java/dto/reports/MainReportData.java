package dto.reports;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
public class MainReportData {

    BigDecimal ordersSum = BigDecimal.ZERO;
    BigDecimal primeCostSum = BigDecimal.ZERO;
    BigDecimal earnings =  ordersSum.subtract(primeCostSum);
    @Setter
    Integer ordersAmount;
    @Setter
    Integer paidOrdersAmount;
    @Setter
    Integer notPaidOrdersAmount;

    public void setOrdersSum(BigDecimal ordersSum) {
        this.ordersSum = ordersSum != null ? ordersSum : BigDecimal.ZERO;
        recalculateEarnings();
    }

    public void setPrimeCostSum(BigDecimal primeCostSum) {
        this.primeCostSum = primeCostSum != null ? primeCostSum : BigDecimal.ZERO;
        recalculateEarnings();
    }

    private void recalculateEarnings() {
        this.earnings = this.ordersSum.subtract(this.primeCostSum);
    }
}
