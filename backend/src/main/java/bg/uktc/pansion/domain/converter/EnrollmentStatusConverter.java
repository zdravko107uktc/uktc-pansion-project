package bg.uktc.pansion.domain.converter;

import bg.uktc.pansion.domain.enums.EnrollmentStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class EnrollmentStatusConverter implements AttributeConverter<EnrollmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(EnrollmentStatus attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public EnrollmentStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : EnrollmentStatus.fromValue(dbData);
    }
}
