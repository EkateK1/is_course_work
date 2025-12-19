package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import model.enums.OrderStatus;

import java.time.OffsetDateTime;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime time;

    @ManyToOne
    @JoinColumn(name = "id_journal_log", nullable = false)
    private JournalLog journalLog;

    @Column(name = "guest_number")
    private Short guestNumber;

    @ManyToOne
    @JoinColumn(name = "id_dish", nullable = false)
    private Dish dish;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false)
    private OrderStatus orderStatus;
//ломбок не робит
    public void setStatus(OrderStatus orderStatus) {
        this.orderStatus = orderStatus;
    }
    public OrderStatus getStatus() {
        return orderStatus;
    }
}
