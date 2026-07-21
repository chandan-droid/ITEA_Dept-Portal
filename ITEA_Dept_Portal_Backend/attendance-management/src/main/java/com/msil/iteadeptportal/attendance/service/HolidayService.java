package com.msil.iteadeptportal.attendance.service;

import com.msil.iteadeptportal.attendance.api.HolidayDTO;
import com.msil.iteadeptportal.attendance.model.Holiday;
import com.msil.iteadeptportal.attendance.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<HolidayDTO> getHolidays(LocalDate fromDate, LocalDate toDate) {
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().withDayOfYear(1);
        LocalDate to   = toDate   != null ? toDate   : LocalDate.now().withDayOfYear(LocalDate.now().lengthOfYear());

        return holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(from, to)
                .stream()
                .map(h -> HolidayDTO.builder()
                        .holidayId(h.getHolidayId())
                        .holidayDate(h.getHolidayDate())
                        .holidayName(h.getHolidayName())
                        .isOptional(h.getIsOptional())
                        .build())
                .collect(Collectors.toList());
    }

    public HolidayDTO createHoliday(HolidayDTO dto) {
        if (dto.getHolidayDate() == null || dto.getHolidayName() == null || dto.getHolidayName().isBlank()) {
            throw new IllegalArgumentException("Holiday date and name are required.");
        }
        Holiday holiday = Holiday.builder()
                .holidayDate(dto.getHolidayDate())
                .holidayName(dto.getHolidayName().trim())
                .description(dto.getHolidayName())
                .isOptional(dto.getIsOptional() != null ? dto.getIsOptional() : false)
                .build();
        holiday = holidayRepository.save(holiday);
        return HolidayDTO.builder()
                .holidayId(holiday.getHolidayId())
                .holidayDate(holiday.getHolidayDate())
                .holidayName(holiday.getHolidayName())
                .isOptional(holiday.getIsOptional())
                .build();
    }

    public HolidayDTO updateHoliday(Long id, HolidayDTO dto) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Holiday not found: " + id));
        if (dto.getHolidayDate() != null) holiday.setHolidayDate(dto.getHolidayDate());
        if (dto.getHolidayName() != null && !dto.getHolidayName().isBlank()) {
            holiday.setHolidayName(dto.getHolidayName().trim());
        }
        if (dto.getIsOptional() != null) holiday.setIsOptional(dto.getIsOptional());
        holidayRepository.save(holiday);
        return HolidayDTO.builder()
                .holidayId(holiday.getHolidayId())
                .holidayDate(holiday.getHolidayDate())
                .holidayName(holiday.getHolidayName())
                .isOptional(holiday.getIsOptional())
                .build();
    }

    public void deleteHoliday(Long id) {
        holidayRepository.deleteById(id);
    }
}
