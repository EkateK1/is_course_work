package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "wallet")
@Getter
@Setter
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "id_employee", nullable = false, unique = true)
    private Employee employee;

    @Column(name="balance", nullable = false)
    private BigDecimal balance = BigDecimal.ZERO;
}
