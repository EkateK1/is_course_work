package model.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "ingredient")
@Getter
@Setter
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "ingredient name is empty")
    private String name;

    @Positive(message = "ingredient price is negative or null")
    @Column(name = "price_per_100g", precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    @PositiveOrZero(message = "ingredient amount is negative")
    @Column(precision = 14, scale = 3, nullable = false)
    private BigDecimal amount;


}
