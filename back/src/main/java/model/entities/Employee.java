package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import model.enums.Positions;

import java.time.LocalDate;

@Entity
@Table(name = "employee")
@Getter
@Setter
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Positions positions;

    @Column(name = "name", columnDefinition = "TEXT", nullable = false)
    private String name;

    @Column(name = "second_name", columnDefinition = "TEXT", nullable = false)
    private String secondName;

    @Column(name = "patronymic", columnDefinition = "TEXT")
    private String patronymic;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    private char sex;

    @Column(name = "password", length = 60)
    private String password;
}
