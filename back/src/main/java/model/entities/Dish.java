package model.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "dish")
@Getter
@Setter
public class Dish {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "dish name is empty")
    private String name;

    @Positive(message = "dish cost is negative or null")
    @Column(name = "prime_cost", nullable = false, insertable = false, updatable = false)
    private BigDecimal primeCost;

    @Positive(message = "dish cost is negative or null")
    @Column(name = "cost", precision = 10, scale = 2, nullable = false)
    private BigDecimal cost;

    @Positive(message = "dish preparing time is negative or null")
    private Integer preparingTime;

    @Column(name = "is_kitchen", nullable = false)
    private boolean isKitchen;

}
