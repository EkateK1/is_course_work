package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import model.enums.BillStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bill")
@Getter
@Setter
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime time;

    @Column(nullable = false)
    private BigDecimal sum;

    @Enumerated(EnumType.STRING)
    @Column(name = "bill_status", nullable = false)
    private BillStatus billStatus;

    @Column(name = "guest_number")
    private Short guestNumber;

    @Transient
    public Integer getBonusPoints() {
        if (sum == null) {
            return 0;
        }
        // 20 бонусов за каждые полные 5000
        BigDecimal fiveThousand = new BigDecimal("5000");
        BigDecimal blocks = sum.divide(fiveThousand, 0, RoundingMode.DOWN);
        return blocks.intValue() * 20;
    }

}
